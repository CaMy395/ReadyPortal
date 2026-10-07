import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentStudio from './ContentStudio';

const draft={id:1,title:'Bridal Mix N’ Sip',caption:'Cheers to the bride!',platform:'instagram',status:'draft',media_id:2,mime:'video/mp4',media_name:'mix.mp4'};
beforeEach(()=>{
  window.fetch=jest.fn(async(url,options={})=>{
    if(url.endsWith('/config')) return {ok:true,json:async()=>({instagramReady:false,canPublish:false})};
    if(url.endsWith('/posts') && !options.method) return {ok:true,json:async()=>[draft]};
    if(url.includes('/media/')) return {ok:false};
    return {ok:true,json:async()=>({...draft,status:'draft'})};
  });
  window.scrollTo=jest.fn();
});
test('disables Instagram publishing until configured without blocking preparation',async()=>{
  render(<ContentStudio/>);
  await screen.findByText('Bridal Mix N’ Sip');
  expect(screen.getByRole('button',{name:'Publish now'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Edit draft'})).toBeEnabled();
  expect(screen.getByText(/TikTok times are posting plans/)).toBeInTheDocument();
});
test('reuse shares assets while allowing a separate TikTok caption',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  fireEvent.click(screen.getByRole('button',{name:'Reuse for TikTok'}));
  expect(screen.getByLabelText('Platform')).toHaveValue('tiktok');
  fireEvent.change(screen.getByLabelText('Caption'),{target:{value:'Shake, sip, celebrate!'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/posts'),expect.objectContaining({method:'POST'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
  const call=window.fetch.mock.calls.find(([,options])=>options?.method==='POST');
  expect(JSON.parse(call[1].body)).toMatchObject({platform:'tiktok',media_id:2,caption:'Shake, sip, celebrate!'});
});
test('editing updates the existing draft instead of making another one',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  fireEvent.click(screen.getByRole('button',{name:'Edit draft'}));
  fireEvent.change(screen.getByLabelText('Caption'),{target:{value:'Updated caption'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/posts/1'),expect.objectContaining({method:'PUT'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
});
afterEach(()=>{jest.restoreAllMocks();});
test('admin connect button shows one-time setup when no Meta app is configured',async()=>{
  jest.spyOn(window,'fetch').mockImplementation(async url=>({ok:true,status:200,json:async()=>String(url).endsWith('/config')?
    {canConnect:true,instagramReady:false,instagramConnectReady:false,instagramCallback:'https://www.readybartending.com/api/instagram/callback'}:[]}));
  render(<ContentStudio/>);
  const button=await screen.findByRole('button',{name:'Connect Instagram'});fireEvent.click(button);
  expect(screen.getByRole('heading',{name:'One-time Instagram setup'})).toBeTruthy();
  expect(screen.getByText('https://www.readybartending.com/api/instagram/callback')).toBeTruthy();
  expect(window.fetch.mock.calls.some(([url])=>String(url).endsWith('/instagram/connect'))).toBe(false);
});
test('assigned Content Studio staff can prepare drafts but cannot connect the account',async()=>{
  jest.spyOn(window,'fetch').mockImplementation(async url=>({ok:true,status:200,json:async()=>String(url).endsWith('/config')?{canConnect:false,instagramReady:false}:[]}));
  render(<ContentStudio/>);
  await waitFor(()=>expect(screen.getByText(/Ask a full administrator to connect Instagram/)).toBeTruthy());
  expect(screen.queryByRole('button',{name:'Connect Instagram'})).toBeNull();
  expect(screen.getByRole('button',{name:'Save draft'})).toBeTruthy();
});
